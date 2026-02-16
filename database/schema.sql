-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create backup_history table
CREATE TABLE IF NOT EXISTS backup_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  backup_type ENUM('mysql', 'files') NOT NULL,
  filename VARCHAR(255) NOT NULL,
  filepath VARCHAR(500) NOT NULL,
  file_size BIGINT,
  status ENUM('success', 'failed') DEFAULT 'success',
  error_message TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  google_drive_file_id VARCHAR(255),
  uploaded_to_drive BOOLEAN DEFAULT FALSE,
  drive_upload_error TEXT,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Insert default admin user
-- Password: admin@789 (hashed with bcrypt)
INSERT INTO users (username, password) VALUES 
('adminserver', '$2a$10$i8sWAnFPMPUIU4neAwhRKevGWS8qhy7thR.aOrWhh3fg28uRcbgMm')
ON DUPLICATE KEY UPDATE username=username;
