from rest_framework import serializers

class GenerationSerializer(serializers.Serializer):
    shop_id = serializers.CharField(max_length=50)
    customer_id = serializers.CharField(max_length=100, required=False)
    product_image = serializers.ImageField()
    person_image = serializers.ImageField()