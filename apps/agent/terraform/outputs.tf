output "access_key_id" {
  value = aws_iam_access_key.agent.id
}

output "secret_access_key" {
  value     = aws_iam_access_key.agent.secret
  sensitive = true # read with: terraform output -raw secret_access_key
}
