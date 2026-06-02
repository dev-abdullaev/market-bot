from rest_framework.permissions import BasePermission


class IsOperatorWithStore(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.role == "operator" and u.store_id)
