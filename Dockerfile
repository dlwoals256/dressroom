# 1. 베이스 이미지 선택 (사용 중인 파이썬 버전에 맞게 수정)
FROM python:3.13

# 2. 환경변수 설정 (Python 로그가 버퍼링 없이 바로 출력되도록 설정)
ENV PYTHONUNBUFFERED 1

# 3. 작업 디렉토리 설정
WORKDIR /app

# 4. 의존성 파일 복사 및 설치 (코드보다 먼저 설치하여 빌드 캐시 활용)
COPY requirements.txt .
RUN pip install -r requirements.txt

# 5. 프로젝트 코드 전체 복사
COPY ./backend .

# [추가] Django의 모든 정적 파일(admin CSS 등)을 한 곳으로 모음.
# 이미지 빌드를 위해 환경 변수 설정이 필요하여 로컬과도 배포 환경과도
# 의미 없는 더미 환경 변수 설정
RUN SECRET_KEY="dummy-key-for-build" \
    DATABASE_URL="postgres://dummy:dummy@dummy/dummy" \
    CSRF_ORIGIN="https://dummy.io" \
    python manage.py collectstatic --noinput

# 6. Gunicorn 웹 서버 실행
# Cloud Run은 기본적으로 8080 포트를 사용.
# 'backend.wsgi:application'에서 'backend'는 wsgi.py 파일이 있는 폴더 이름.
# 만약 프로젝트 이름이 다르다면 그에 맞게 수정.
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "config.wsgi:application"]