from django.urls import path
from .views import upload_file_view

urlpatterns = [
    # The name 'upload_file' is used in the template's {% url %} tag
    path('', upload_file_view, name='upload_file'),
]