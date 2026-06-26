/**
 * Construye la URL pública de un blob en Azure Storage.
 * Retorna null si el path está vacío o si la variable de entorno no está definida.
 */
export function buildPublicUrl(blobPath: string | null | undefined): string | null {
  if (!blobPath) return null;
  const account = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  if (!account) return null;
  return `https://${account}.blob.core.windows.net/public-assets/${blobPath}`;
}
