sudo apt update
sudo apt upgrade
sudo apt install php8.3-cli php8.3-fpm php8.3-mysql php8.3-opcache php8.3-mbstring php8.3-xml php8.3-gd php8.3-curl -y
cd /var/www/html/
wget https://wordpress.org/latest.tar.gz
tar xf latest.tar.gz