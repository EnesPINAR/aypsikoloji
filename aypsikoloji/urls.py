# aypsikoloji/urls.py

from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView

# --- GÜNCELLENDİ: Sadece 'ensure_csrf_cookie' yeterli ---
from django.views.decorators.csrf import ensure_csrf_cookie
# 'method_decorator' importuna artık gerek yok
# from django.utils.decorators import method_decorator 
# --- GÜNCELLEME SONU ---


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls')),
    path('api/', include('appointments.urls')),
    
    # --- GÜNCELLENDİ (Çok daha basit) ---
    # React'e yönlendiren catch-all kuralı.
    # 
    # 'TemplateView.as_view(...)' bir fonksiyon döndürür.
    # 'ensure_csrf_cookie(...)' ise bu fonksiyonu doğrudan
    # sarmalayarak (wrap) 'csrftoken' çerezini ekler.
    re_path(
        r'^(?!api-auth/?|api/?|admin/?).*$', 
        ensure_csrf_cookie(
            TemplateView.as_view(template_name='index.html')
        )
    ),
]   