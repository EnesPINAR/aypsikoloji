from django.shortcuts import render
from .models import Contacts

# Create your views here.
def contact(request):
    data = Contacts.objects.last()
    return render(request, 'contact.html', {"data":data})