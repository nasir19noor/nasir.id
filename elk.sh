sudo apt update
#install java
# apt install openjdk-21-jre-headless

#install nginx
# apt install nginx

#install elasticsearch
curl -fsSL https://artifacts.elastic.co/GPG-KEY-elasticsearch |sudo gpg --dearmor -o /usr/share/keyrings/elastic.gpg
echo "deb [signed-by=/usr/share/keyrings/elastic.gpg] https://artifacts.elastic.co/packages/7.x/apt stable main" | sudo tee -a /etc/apt/sources.list.d/elastic-7.x.list
sudo apt update
sudo apt install elasticsearch -y
sudo echo "network.host: localhost" | sudo tee -a /etc/elasticsearch/elasticsearch.yml
sudo systemctl start elasticsearch
sudo systemctl enable elasticsearch
curl -X GET "localhost:9200"

#install Kibana
sudo apt install kibana
sudo systemctl enable kibana
sudo systemctl start kibana
echo "kibanaadmin:`openssl passwd -apr1`" | sudo tee -a /etc/nginx/htpasswd.users
sudo tee /etc/nginx/sites-available/elk.nasir.id > /dev/null << 'EOT'
server {
  listen 80;
  listen [::]:80;

  server_name elk.nasir.id www.elk.nasir.id;

  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl;
  server_name elk.nasir.id www.elk.nasir.id;

  access_log /var/log/nginx/elk.nasir.id.access.log;
  error_log /var/log/nginx/elk.nasir.id.error.log;

  ssl_certificate /etc/letsencrypt/live/elk.nasir.id/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/elk.nasir.id/privkey.pem;
  auth_basic "Restricted Access";
  auth_basic_user_file /etc/nginx/htpasswd.users;

  location / {
  proxy_pass http://localhost:5601;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
 }
}
EOT
sudo ln -s /etc/nginx/sites-available/elk.nasir.id /etc/nginx/sites-enabled/elk.nasir.id
sudo nginx -t
sudo systemctl reload nginx

# install logstatsh
sudo apt install logstash
sudo tee /etc/logstash/conf.d/02-beats-input.conf > /dev/null << 'EOT'
input {
  beats {
    port => 5044
  }
}
EOT
sudo tee /etc/logstash/conf.d/30-elasticsearch-output.conf > /dev/null << 'EOT'
output {
  if [@metadata][pipeline] {
	elasticsearch {
  	hosts => ["localhost:9200"]
  	manage_template => false
  	index => "%{[@metadata][beat]}-%{[@metadata][version]}-%{+YYYY.MM.dd}"
  	pipeline => "%{[@metadata][pipeline]}"
	}
  } else {
	elasticsearch {
  	hosts => ["localhost:9200"]
  	manage_template => false
  	index => "%{[@metadata][beat]}-%{[@metadata][version]}-%{+YYYY.MM.dd}"
	}
  }
}
EOT
sudo -u logstash /usr/share/logstash/bin/logstash --path.settings /etc/logstash -t
sudo systemctl start logstash
sudo systemctl enable logstash


