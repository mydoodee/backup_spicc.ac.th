import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

class SshService {
    constructor() {
        this.config = {
            host: process.env.REMOTE_HOST,
            port: process.env.REMOTE_PORT || 22,
            username: process.env.REMOTE_USER,
            password: process.env.REMOTE_PASSWORD,
            // privateKey: process.env.REMOTE_KEY_PATH ? fs.readFileSync(process.env.REMOTE_KEY_PATH) : undefined
        };
    }

    isEnabled() {
        return !!(process.env.REMOTE_HOST && process.env.REMOTE_USER && process.env.REMOTE_PASSWORD);
    }

    connect() {
        return new Promise((resolve, reject) => {
            const conn = new Client();
            conn.on('ready', () => {
                resolve(conn);
            }).on('error', (err) => {
                reject(err);
            }).connect({
                host: process.env.REMOTE_HOST,
                port: process.env.REMOTE_PORT || 22,
                username: process.env.REMOTE_USER,
                password: process.env.REMOTE_PASSWORD
            });
        });
    }

    /**
     * Creates a tarball of a remote directory and streams it to a local file
     * @param {string} remotePath Path to the remote directory
     * @param {string} localPath Path to save the tarball locally
     */
    async downloadDirectoryAsTar(remotePath, localPath) {
        const conn = await this.connect();

        return new Promise((resolve, reject) => {
            // Command to tar the directory and output to stdout
            // -c: create
            // -z: gzip
            // -f -: output to stdout
            // -C: change directory (to avoid including full path parents)
            const parentDir = path.dirname(remotePath).replace(/\\/g, '/');
            const targetDir = path.basename(remotePath);
            const cmd = `tar -czf - -C "${parentDir}" "${targetDir}"`;

            console.log(`Executing remote command: ${cmd}`);

            conn.exec(cmd, (err, stream) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }

                const writeStream = fs.createWriteStream(localPath);

                stream.pipe(writeStream);

                let stderr = '';

                stream.stderr.on('data', (data) => {
                    stderr += data;
                });

                stream.on('close', (code, signal) => {
                    conn.end();
                    if (code !== 0 && code !== null) { // code is null if stream closed successfully
                        // Sometimes tar might exit with minor warnings (code 1), check stderr
                        if (stderr && !stderr.includes('Removing leading')) {
                            console.warn('Remote tar warning:', stderr);
                        }
                    }
                    // We rely on writeStream finish for resolve
                });

                writeStream.on('finish', () => {
                    resolve(localPath);
                    conn.end();
                });

                writeStream.on('error', (err) => {
                    conn.end();
                    reject(err);
                });
            });
        });
    }
}

export default new SshService();
