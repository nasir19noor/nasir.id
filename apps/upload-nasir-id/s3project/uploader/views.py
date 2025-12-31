from django.shortcuts import render
from .forms import FileUploadForm
from botocore.exceptions import ClientError
from django.contrib.auth.decorators import login_required # Import the decorator

@login_required # Add this decorator
def upload_file_view(request):
    print("View entered.")
    if request.method == 'POST':
        print("POST request received.")
        form = FileUploadForm(request.POST, request.FILES)
        if form.is_valid():
            print("Form is valid.")
            try:
                print("Attempting to save form and upload file to S3...")
                uploaded_file_instance = form.save()
                print(f"File saved. Instance PK: {uploaded_file_instance.pk}")
                
                context = {
                    'file_url': uploaded_file_instance.public_url,
                    'file_name': str(uploaded_file_instance)
                }
                print(f"Context for success page: {context}")
                return render(request, 'uploader/upload_success.html', context)
            except ClientError as e:
                error_message = f"An AWS error occurred: {e}"
                print(error_message)
                return render(request, 'uploader/upload_form.html', {'form': form, 'aws_error': error_message})
            except Exception as e:
                error_message = f"An unexpected error occurred: {e}"
                print(error_message)
                return render(request, 'uploader/upload_form.html', {'form': form, 'aws_error': error_message})
        else:
            print("Form is NOT valid.")
            print(form.errors.as_json())
            return render(request, 'uploader/upload_form.html', {'form': form})
    else:
        print("GET request received.")
        form = FileUploadForm()

    return render(request, 'uploader/upload_form.html', {'form': form})