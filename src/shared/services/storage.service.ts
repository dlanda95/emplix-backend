import { 
  BlobServiceClient, 
  generateBlobSASQueryParameters, 
  BlobSASPermissions, 
  StorageSharedKeyCredential 
} from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const AZURE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || '';

export class StorageService {
  private blobServiceClient: BlobServiceClient;

  constructor() {
    if (!AZURE_CONNECTION_STRING) {
      throw new Error('FATAL: Azure Storage Connection String no configurada en .env');
    }
    this.blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_CONNECTION_STRING);
  }

  // --- MÉTODO DE SUBIDA (Igual que antes) ---
  async uploadFile(file: Express.Multer.File, containerName: string, folderPath: string) {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      await containerClient.createIfNotExists({ access: containerName === 'public-assets' ? 'blob' : undefined });

      const fileExtension = path.extname(file.originalname);
      const uniqueFileName = `${uuidv4()}${fileExtension}`;
      const blobName = `${folderPath}/${uniqueFileName}`;
      
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: file.mimetype }
      });

      return {
        url: blockBlobClient.url,
        path: blobName,
        container: containerName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      };
    } catch (error) {
      console.error('Error crítico subiendo a Azure:', error);
      throw new Error('Error al conectar con el servicio de almacenamiento');
    }
  }

  // --- NUEVO: GENERADOR DE PASE VIP (SAS Token) ---
  getSignedUrl(containerName: string, blobPath: string, expiresInMinutes: number = 15): string {
    try {
      // 1. Necesitamos extraer la clave y el nombre de la cuenta de la Connection String
      // Formato: "DefaultEndpointsProtocol=https;AccountName=...;AccountKey=..."
      const accountNameMatch = AZURE_CONNECTION_STRING.match(/AccountName=([^;]+)/);
      const accountKeyMatch = AZURE_CONNECTION_STRING.match(/AccountKey=([^;]+)/);

      if (!accountNameMatch || !accountKeyMatch) {
        throw new Error('No se pudieron extraer las credenciales de Azure');
      }

      const accountName = accountNameMatch[1];
      const accountKey = accountKeyMatch[1];

      // 2. Crear las credenciales para firmar
      const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

      // 3. Configurar los permisos (Solo Lectura) y la expiración
      const sasOptions = {
        containerName,
        blobName: blobPath,
        permissions: BlobSASPermissions.parse("r"), // "r" = Read (Leer)
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + expiresInMinutes * 60 * 1000), // Ahora + X minutos
      };

      // 4. Generar el Token (La firma criptográfica)
      const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();

      // 5. Construir la URL completa
      // Resultado: https://cuenta.blob.core.../carpeta/archivo.pdf?Firma_Larga...
      return `https://${accountName}.blob.core.windows.net/${containerName}/${blobPath}?${sasToken}`;

    } catch (error) {
      console.error('Error generando SAS Token:', error);
      return ''; // Si falla, retornamos vacío o lanzamos error según prefieras
    }
  }

  // --- BORRAR (Igual que antes) ---
  async deleteFile(containerName: string, blobPath: string) {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
      await blockBlobClient.deleteIfExists();
    } catch (error) {
      console.warn(`No se pudo eliminar el archivo ${blobPath}`, error);
    }
  }
}