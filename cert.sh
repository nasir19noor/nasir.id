sudo service nginx stop
sudo certbot certonly --standalone -d jenkins.nasir.id
sudo certbot certonly --standalone -d grafana.nasir.id
sudo certbot certonly --standalone -d job-portal.nasir.id
sudo certbot certonly --standalone -d admin.job-portal.nasir.id
sudo certbot certonly --standalone -d chat.nasir.id
sudo certbot certonly --standalone -d prometheus.nasir.id
sudo certbot certonly --standalone -d nasir.id
sudo certbot certonly --standalone -d yt-to-blog.nasir.id
sudo certbot certonly --standalone -d elk.nasir.id
sudo service nginx start
sudo service nginx status
