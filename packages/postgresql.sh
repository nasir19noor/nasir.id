sudo apt install postgresql postgresql-contrib -y
sudo systemctl status postgresql
sudo -i -u postgres
psql
\password postgres
sudo systemctl enable postgresql

#create user
sudo -u postgres createuser --interactive
#create database
sudo -u postgres createdb mydatabase