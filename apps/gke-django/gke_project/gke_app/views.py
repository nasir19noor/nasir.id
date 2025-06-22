from django.http import HttpResponse

def index(request):
    return HttpResponse("Hello from Django deployed on GKE, Nasir! Update")