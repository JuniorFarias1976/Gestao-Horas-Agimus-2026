/**
 * StorageProvider
 * Atualmente utiliza LocalStorage para persistência.
 * Para conectar a um "Loja Blob" (Vercel Blob, S3, etc), 
 * altere os métodos desta classe para realizar chamadas de API.
 */
export class StorageProvider {
  static get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Erro ao ler do banco de dados (Key: ${key})`, error);
      return defaultValue;
    }
  }

  static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Erro ao salvar no banco de dados (Key: ${key})`, error);
    }
  }

  static remove(key: string): void {
    localStorage.removeItem(key);
  }
}