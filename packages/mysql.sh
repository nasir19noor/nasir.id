sudo apt update
sudo apt install mysql-server -y
mysql --version
#Manage the MySQL System Service
sudo systemctl enable mysql
sudo systemctl start mysql
sudo systemctl status mysql
#Secure the MySQL Server
sudo mysql_secure_installation
sudo systemctl restart mysql
sudo mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED BY 'New-Password-Here';
FLUSH PRIVILEGES;


#create username
CREATE USER 'wp1'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON wp1.* TO 'wp1'@'localhost';
FLUSH PRIVILEGES;
SELECT User, Host FROM mysql.user WHERE User = 'wp1';
SHOW GRANTS FOR 'wp1'@'localhost';
