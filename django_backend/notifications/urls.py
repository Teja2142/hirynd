from django.urls import path
from . import views

urlpatterns = [
    path('', views.my_notifications, name='my_notifications'),
    path('<uuid:notification_id>/read/', views.mark_read, name='mark_read'),
    path('email-logs/', views.email_logs, name='email_logs'),
]
