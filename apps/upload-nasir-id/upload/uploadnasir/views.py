from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

def index(request):
    return render(request, 'index.html')

def about(request):
    context = {
        'title': 'About Us',
        'content': 'We are a modern company focused on delivering excellent solutions.'
    }
    return render(request, 'about.html', context)

@csrf_exempt
def contact(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name')
            email = data.get('email')
            message = data.get('message')
            
            # Here you would typically save to database or send email
            print(f"Contact form submission: {name}, {email}, {message}")
            
            return JsonResponse({'status': 'success', 'message': 'Thank you for your message!'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': 'Something went wrong.'})
    
    return render(request, 'contact.html')
# Create your views here.
