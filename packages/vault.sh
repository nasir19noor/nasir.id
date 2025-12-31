#https://claude.ai/chat/31af1c57-0e88-45f5-b3f6-d22620fb535a
sudo apt update && sudo apt upgrade -y
sudo apt install curl wget gnupg lsb-release nginx certbot python3-certbot-nginx -y
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt update
sudo apt install vault -y
vault version

# create Vault user and Directories
sudo useradd --system --home /etc/vault.d --shell /bin/false vault
sudo mkdir -p /opt/vault/data
sudo mkdir -p /etc/vault.d
sudo mkdir -p /var/log/vault
sudo chown -R vault:vault /opt/vault
sudo chown -R vault:vault /etc/vault.d
sudo chown -R vault:vault /var/log/vault

#Configure vault
sudo tee /etc/vault.d/vault.hcl << 'EOF'
ui = true
disable_mlock = true

storage "file" {
  path = "/opt/vault/data"
}

listener "tcp" {
  address     = "127.0.0.1:8200"
  tls_disable = 1
}

api_addr = "https://vault.nasir.id"
cluster_addr = "https://vault.nasir.id:8201"

log_level = "INFO"
log_file = "/var/log/vault/vault.log"
EOF

sudo chown vault:vault /etc/vault.d/vault.hcl
sudo chmod 640 /etc/vault.d/vault.hcl

# Create Systemd Service
sudo tee /etc/systemd/system/vault.service << 'EOF'
[Unit]
Description=HashiCorp Vault
Documentation=https://www.vaultproject.io/docs/
Requires=network-online.target
After=network-online.target
ConditionFileNotEmpty=/etc/vault.d/vault.hcl
StartLimitIntervalSec=60
StartLimitBurst=3

[Service]
Type=notify
User=vault
Group=vault
ProtectSystem=full
ProtectHome=read-only
PrivateTmp=yes
PrivateDevices=yes
SecureBits=keep-caps
AmbientCapabilities=CAP_IPC_LOCK
CapabilityBoundingSet=CAP_SYSLOG CAP_IPC_LOCK
NoNewPrivileges=yes
ExecStart=/usr/bin/vault server -config=/etc/vault.d/vault.hcl
ExecReload=/bin/kill -HUP $MAINPID
KillMode=process
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
StartLimitInterval=60
StartLimitBurst=3
LimitNOFILE=65536
LimitMEMLOCK=infinity

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable vault
sudo systemctl start vault
sudo systemctl status vault

#configure ssl
service nginx stop
sudo certbot certonly --standalone -d vault.nasir.id 
sudo systemctl start nginx

sudo tee /etc/nginx/sites-available/vault.nasir.id << 'EOF'
server {
    listen 80;
    server_name vault.nasir.id;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name vault.nasir.id;

    ssl_certificate /etc/letsencrypt/live/vault.nasir.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vault.nasir.id/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass http://127.0.0.1:8200;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # WebSocket support for UI
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/vault.nasir.id /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

#initialize vault
export VAULT_ADDR="https://vault.nasir.id"
vault operator init

#unseal Vault
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>

#Login to Vault
vault auth <root_token>