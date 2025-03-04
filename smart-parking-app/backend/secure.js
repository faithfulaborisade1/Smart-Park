const bcrypt = require('bcryptjs');

const password = "admin.123"; // Change this to your desired password
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) throw err;
    console.log("Hashed Password:", hash);
});
