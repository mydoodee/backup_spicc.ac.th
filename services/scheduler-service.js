import cron from 'node-cron';
import backupService from './backup-service.js';
import { db } from '../server.js';

class SchedulerService {
    constructor() {
        this.jobs = [];
    }

    async init() {
        await this.loadAndSchedule();
    }

    async loadAndSchedule() {
        // Stop existing jobs
        this.jobs.forEach(job => job.stop());
        this.jobs = [];

        try {
            // Read settings from database
            const [settings] = await db.query('SELECT setting_key, setting_value FROM settings');
            const config = {};
            settings.forEach(s => {
                config[s.setting_key] = s.setting_value;
            });

            const enabled = config['auto_backup_enabled'] === 'true';
            if (!enabled) {
                console.log('ℹ️  Auto-backup is disabled (from DB)');
                return;
            }

            const cronExpression = config['auto_backup_cron'] || '0 3 * * *';
            const backupType = config['auto_backup_type'] || 'both';

            console.log(`🕒 Scheduling auto-backup (${backupType}) from DB with expression: ${cronExpression}`);

            const job = cron.schedule(cronExpression, async () => {
                console.log('🚀 Running scheduled auto-backup...');

                try {
                    const [users] = await db.query('SELECT id FROM users WHERE username = ?', ['adminserver']);
                    const systemUserId = users.length > 0 ? users[0].id : 1;

                    if (backupType === 'mysql' || backupType === 'both') {
                        console.log('Running automated MySQL backup...');
                        await backupService.runMysqlBackup(systemUserId);
                    }

                    if (backupType === 'files' || backupType === 'both') {
                        console.log('Running automated File System backup...');
                        await backupService.runFilesBackup(systemUserId);
                    }

                    console.log('✅ Automated auto-backup completed successfully');
                } catch (err) {
                    console.error('❌ Automated auto-backup failed:', err.message);
                }
            });

            this.jobs.push(job);
        } catch (err) {
            console.error('❌ Failed to load scheduler config from DB:', err.message);
            // Fallback to env if needed or just wait for next try
        }
    }

    async reload() {
        console.log('🔄 Reloading scheduler configuration...');
        await this.loadAndSchedule();
    }
}

export default new SchedulerService();
