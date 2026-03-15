from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsAdmin
from .models import Notification, EmailLog
from .serializers import NotificationSerializer, EmailLogSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_notifications(request):
    notifs = Notification.objects.filter(user=request.user)
    unread_only = request.query_params.get('unread')
    if unread_only == 'true':
        notifs = notifs.filter(is_read=False)
    return Response(NotificationSerializer(notifs[:50], many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_read(request, notification_id):
    Notification.objects.filter(id=notification_id, user=request.user).update(is_read=True)
    return Response({'message': 'Marked as read'})


@api_view(['GET'])
@permission_classes([IsAdmin])
def email_logs(request):
    logs = EmailLog.objects.all()[:100]
    return Response(EmailLogSerializer(logs, many=True).data)
