sudo apt update
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
sudo apt-get update
sudo apt-get install google-cloud-sdk-gke-gcloud-auth-plugin -y
gke-gcloud-auth-plugin --version
sudo apt install kubectl
gcloud container clusters get-credentials nasir-cluster --zone asia-southeast1-c