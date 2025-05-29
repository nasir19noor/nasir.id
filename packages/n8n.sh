sudo apt update -y
sudo apt upgrade -y
sudo apt install nodejs -y
sudo apt install npm -y
npm install n8n -g
# Install nvm if you don't have it
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
# Restart your terminal or run:
source ~/.bashrc
# Install and use Node.js 20 LTS
nvm install 20
nvm use 20
# Verify the version
node --version
export N8N_SECURE_COOKIE=false
export WEBHOOK_URL=https://n8n.nasir.id
npm install pm2 -g
pm2 start n8n
pm2 startup