from rest_framework import serializers
from .models import ShopProfile, CustomUser, UserProfile
from django.db import transaction
from django.contrib.auth import authenticate
from rest_framework.authtoken.serializers import AuthTokenSerializer as DRFAuthTokenSerializer

class UserRequestSerializer(serializers.Serializer):
    shop_id = serializers.CharField(required=True)
    customer_id = serializers.CharField(required=True)
    person_image = serializers.ImageField(required=True)
    product_image = serializers.ImageField(required=True)

    def validate_shop_id(self, value):
        if not ShopProfile.objects.filter(shop_id=value).exists():
            raise serializers.ValidationError(
                f'User with the account [ {value} ] does not exist.'
            )
        return value
    

class UserCreateSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(source='profile.phone', required=False, allow_blank=True)

    class Meta:
        model = CustomUser
        fields = ['email', 'password', 'username', 'phone']
        extra_kwargs = {'password': {'write_only': True}}
    
    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})

        user = CustomUser.objects.create_user(**validated_data)

        UserProfile.objects.create(user=user, **profile_data)
        
        return user


class ShopCreateSerializer(serializers.Serializer):
    email = serializers.EmailField(write_only=True)
    shop_name = serializers.CharField()

    def validate_email(self, value):
        if not CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError('User with this email does not exist.')
        return value
    
    def create(self, validated_data):
        email = validated_data.pop('email')
        shop_name = validated_data.pop('shop_name')

        user = CustomUser.objects.get(email=email)

        shop_id = f'{user.username}_{shop_name}'

        if ShopProfile.objects.filter(shop_id=shop_id).exists():
            raise serializers.ValidationError({
                'shop_name': 'Shop with this name already exists for this user.'
            })

        shop_profile = ShopProfile.objects.create(
            user=user,
            shop_id=shop_id,
            shop_name=shop_name
        )

        return shop_profile
    
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['phone']
    
class CustomUserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)
    class Meta:
        model = CustomUser
        fields = [
            'id',
            'username',
            'email',
            'password',
            'profile'
        ]
        extra_kwargs = {'password': {'write_only': True}}

    @transaction.atomic
    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password')

        user = CustomUser.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()

        UserProfile.objects.create(user=user, **profile_data)

        return user
    
    @transaction.atomic
    def update(self, instance, validated_data):
        if 'password' in validated_data:
            password = validated_data.pop('password')
            instance.set_password(password)

        profile_data = validated_data.pop('profile', {})

        user = super().update(instance, validated_data)

        if hasattr(user, 'profile'):
            profile_serializer = self.fields['profile']
            profile_instance = user.profile
            profile_serializer.update(profile_instance, profile_data)
        else:
            UserProfile.objects.update(user=user, **profile_data)

        return user

class LoginSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('username', 'password')


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate(self, data):
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError('Request context is missing.')

        user = request.user
        old_password = data.get('old_password')
        new_password = data.get('new_password')

        if not user.check_password(old_password):
            raise serializers.ValidationError({
                'old_password': ['Wrong password.']
            })
        
        if old_password == new_password:
            raise serializers.ValidationError({
                'new_password': ['New password cannot be the same as the old password.']
            })
        
        self.instance = user
        return data

    @transaction.atomic
    def update(self, instance, validated_data):
        new_password = validated_data.get('new_password')
        instance.set_password(new_password)
        instance.save()
        return instance