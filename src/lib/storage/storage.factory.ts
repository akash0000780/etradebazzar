import { StorageProvider } from "./storage.interface";
import { S3Provider } from "./s3.provider";
import { DigitalOceanSpacesProvider } from "./digitalocean.provider";

type StorageProviderType = "s3" | "digitalocean";

class StorageFactory {
    private static instance: StorageProvider | null = null;

    static get(provider?: StorageProviderType): StorageProvider {
        if (!this.instance) {
            const key = (provider ?? process.env["STORAGE_PROVIDER"] ?? "s3") as StorageProviderType;
            this.instance = this.create(key);
        }
        return this.instance;
    }

    private static create(provider: StorageProviderType): StorageProvider {
        switch (provider) {
            case "s3":
                return new S3Provider();
            case "digitalocean":
                return new DigitalOceanSpacesProvider();

            default:
                throw new Error(`Unsupported storage provider: ${provider}`);
        }
    }
}

export { StorageFactory };