from django.db import models
import os

class UploadedFile(models.Model):
    # The 'upload_to' path will be the subdirectory inside your S3 bucket's media folder.
    file = models.FileField(upload_to='')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        # Returns the original filename.
        return os.path.basename(self.file.name)

    @property
    def public_url(self):
        """
        Returns the public URL of the file stored on S3.
        django-storages handles the URL generation automatically.
        """
        if self.file:
            return self.file.url
        return None