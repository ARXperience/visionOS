import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export class HashUtil {
  static hash(data: string): Promise<string> {
    return bcrypt.hash(data, SALT_ROUNDS);
  }

  static compare(data: string, encrypted: string): Promise<boolean> {
    return bcrypt.compare(data, encrypted);
  }
}
