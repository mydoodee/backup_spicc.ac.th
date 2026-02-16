import bcrypt from 'bcryptjs';

const password = 'admin@789';
const hash = bcrypt.hashSync(password, 10);

console.log('Hashed password for admin@789:');
console.log(hash);
console.log('\nUse this hash in database/schema.sql');
