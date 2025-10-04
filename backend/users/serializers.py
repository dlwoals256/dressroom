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

class UserRegisterationSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = UserProfile
        fields = ['email', 'password', 'phone']

    @transaction.atomic
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        password = validated_data.pop('password')

        profile_data = validated_data
        
        user = CustomUser.objects.create_user(
            email=user_data['email'],
            password=password
        )
        user_profile = UserProfile.objects.create(user=user, **profile_data)

        return user_profile

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(
        required=True,
        write_only=True
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}, # DRF UI에서 비밀번호 필드로 보이게 함
    )

    def validate(self, data):
        user = authenticate(email=data['email'], password=data['password'])
        if user:
            return user
        raise serializers.ValidationError('Email or password doesn\'t matches.')

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['phone']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'last_login', 'profile']

class ShopProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopProfile
        fields = ['id', 'user', 'shop_id', 'shop_name', 'tier', 'count']
        read_only_fields = ['user', 'tier', 'count']
