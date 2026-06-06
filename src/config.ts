import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export interface Config {
  dbUrl: string;
  current_user_name?: string;
}

const configPath = path.join(os.homedir(), '.gatorconfig.json');

export function readConfig(): Config {
  if (!fs.existsSync(configPath)) {
    return { dbUrl: "postgres://postgres@127.0.0.1:5432/gator?sslmode=disable" };
  }
  const data = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(data);
  return {
    dbUrl: parsed.db_url || "postgres://postgres@127.0.0.1:5432/gator?sslmode=disable",
    current_user_name: parsed.current_user_name
  };
}

export function writeConfig(config: Config) {
  const currentData = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
  const newData = {
    ...currentData,
    db_url: config.dbUrl,
    current_user_name: config.current_user_name
  };
  fs.writeFileSync(configPath, JSON.stringify(newData, null, 2));
}
