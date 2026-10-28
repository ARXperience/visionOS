export declare class HashUtil {
    static hash(data: string): Promise<string>;
    static compare(data: string, encrypted: string): Promise<boolean>;
}
