# Pulsara - Social Media Management & Analyzer

A comprehensive social media management and analytics platform focusing on Threads by Meta, powered by AWS Bedrock AI.

## Features

- **AI-Powered Content Creation**: Generate engaging posts using AWS Bedrock
- **Content Optimization**: Improve existing content for better engagement
- **Smart Hashtag Generation**: Automatically generate relevant hashtags
- **Sentiment Analysis**: Analyze tone and mood before posting
- **Optimal Timing Suggestions**: AI-powered posting time recommendations
- **Analytics**: Track engagement and performance metrics
- **Management**: Manage multiple accounts and campaigns

## Domains

- **Frontend**: https://pulsara.nasir.id
- **Backend API**: https://api.pulsara.nasir.id

## Project Structure

```
apps/pulsara/
├── frontend/          # Next.js frontend application (Port 5001)
├── backend/           # FastAPI backend application (Port 9001)
└── README.md
```

## Getting Started

### Frontend (Next.js)
```bash
cd apps/pulsara/frontend
npm install
npm run dev  # Runs on port 5001
```

### Backend (FastAPI)
```bash
cd apps/pulsara/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 9001
```

## AI Features

Pulsara leverages AWS Bedrock for advanced AI capabilities:

- **Content Generation**: Create posts from simple prompts
- **Content Optimization**: Improve engagement potential
- **Hashtag Generation**: Relevant hashtag suggestions
- **Sentiment Analysis**: Tone and mood analysis
- **Timing Optimization**: Best posting time suggestions

## Environment Variables

### Backend (.env)
```
# AWS Bedrock Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
BEDROCK_REGION=us-east-1

# Other configurations...
```

## Deployment

The application is automatically deployed via GitHub Actions when changes are pushed to the main branch:

- Frontend deploys to port 5001
- Backend deploys to port 9001
- Domains are configured via reverse proxy