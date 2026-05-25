# ☁️ Bulutda Tarmoq — BTEC 6-Birlik Vazifasi

> **Korporativ Bulut Tarmoq Demosi** — Docker, Nginx, Prometheus va Grafana yordamida ERP / CRM / WMS tizimi

---

## 📋 Loyiha Haqida

Bu loyiha korporativ darajadagi bulut tarmoq tushunchalarini ishlaydigan real tizim orqali namoyish etadi.
U kompaniya ERP, CRM va WMS tizimini bulutda joylashtirishda foydalanadigan tarmoq arxitekturasini simulyatsiya qiladi —
VPC dizayni, yukni muvozanatlash, teskari proksi, monitoring, CI/CD va gorizontal masshtablash kabi tushunchalarni qamrab oladi.

| Komponent           | Texnologiya          | Maqsad                                            |
|---------------------|----------------------|---------------------------------------------------|
| Yukni Muvozanatlash | Nginx                | Teskari proksi, round-robin taqsimlash            |
| ERP Backend         | Node.js / Express    | 1-Xizmat — Korxona Resurslarini Boshqarish        |
| CRM/WMS Backend     | Node.js / Express    | 2-Xizmat — Mijozlar va Omborni Boshqarish         |
| Fronted Dashboard   | HTML / CSS / JS      | Yukni muvozanatlashni jonli vizuallashtirish      |
| Monitoring          | Prometheus + Grafana | Metrikalar, CPU, xotira, so'rovlar soni           |
| Konteynerlashtirish | Docker + Compose     | Izolyatsiyalangan, ko'chma joylashtirish          |
| CI/CD               | GitHub Actions       | Avtomatlashtirilgan qurish, test va joylashtirish |

---

## 🏗️ Arxitektura

```
                           INTERNET
                              │
                              ▼
                    ┌───────────────────┐
                    │  Internet Shlyuzi │
                    │  (Ochiq kirish)   │
                    └────────┬──────────┘
                             │
              ┌───────────────────────────┐
              │   OCHIQ SUBNET            │
              │   ┌────────────────────┐  │
              │   │   Nginx LB         │  │
              │   │   :8888            │  │
              │   │   Round Robin      │  │
              │   └──────┬──────┬──────┘  │
              └──────────┼──────┼─────────┘
                         │      │
           ┌─────────────┘      └───────────────┐
           │                                    │
  ┌────────────────┐                 ┌────────────────────┐
  │ YOPIQ SUBNET A │                 │ YOPIQ SUBNET B     │
  │ 10.0.2.0/24    │                 │ 10.0.3.0/24        │
  │ ┌────────────┐ │                 │ ┌────────────────┐ │
  │ │ ERP Xizmat │ │                 │ │ CRM/WMS Xizmat │ │
  │ │ :3001      │ │                 │ │ :3002          │ │
  │ └────────────┘ │                 │ └────────────────┘ │
  └────────────────┘                 └────────────────────┘
           │                                    │
           └────────────────┬───────────────────┘
                            │
              ┌─────────────────────────┐
              │  MONITORING SUBNETI     │
              │  Prometheus :9090       │
              │  Grafana :3030          │
              └─────────────────────────┘
```

---

## 🚀 Tezkor Ishga Tushirish

### Talablar
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) o'rnatilgan bo'lishi kerak
- [Git](https://git-scm.com/) o'rnatilgan bo'lishi kerak
- 8888-port bo'sh bo'lishi kerak

### 1. Loyihani yuklab olish
```bash
git clone https://github.com/Miraziz719/networking.git
cd networking
```

### 2. Asosiy stekni ishga tushirish
```bash
docker compose up --build -d
```

### 3. Dashboardni ochish
Manzil: **http://localhost:8888**

### 4. Monitoringni ishga tushirish (ixtiyoriy, alohida terminal)
```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up --build -d
```

| Xizmat                 | URL                              | Kirish ma'lumotlari |
|------------------------|----------------------------------|---------------------|
| Dashboard              | http://localhost:8888            | —                   |
| Prometheus             | http://localhost:9090            | —                   |
| Grafana                | http://localhost:3030            | admin / btecunit6   |
| ERP To'g'ridan-to'g'ri | http://localhost:8888/health/service1 | —              |
| CRM To'g'ridan-to'g'ri | http://localhost:8888/health/service2 | —              |

---

## ⚡ Yukni Muvozanatlashni Namoyish Etish

### 1-usul: Brauzer orqali
**http://localhost:8888** ni oching va **"So'rov Yuborish"** tugmasini ketma-ket bosing.
Faol Xizmat bannerining ERP va CRM/WMS o'rtasida almashib turishini kuzating — bu round-robin!

### 2-usul: Buyruq satri orqali
```bash
# 10 ta so'rov yuborib, xizmat almashishini kuzating
for i in {1..10}; do
  curl -s http://localhost:8888/api/ | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['service'])"
done
```

### 3-usul: Yuklamani test qilish
```bash
chmod +x scripts/load-test.sh
./scripts/load-test.sh --requests 100 --url http://localhost:8888
```

---

## 📈 Gorizontal Masshtablash

Bir nechta nusxa ishga tushirish:
```bash
# Har bir xizmatdan 3 ta nusxa ishga tushirish (jami 6 ta backend)
docker compose up --build -d --scale service-1=3 --scale service-2=3
```

Nginx hech qanday sozlama o'zgartirmasdan barcha nusxalar bo'ylab so'rovlarni avtomatik taqsimlaydi.
Har bir API javobidagi `hostname` maydoni turli konteyner IDlarini ko'rsatadi — bu so'rovlarning
barcha nusxalarga tarqalatganini isbotlaydi.

---

## 📊 Monitoring

Monitoring stekini ishga tushirgandan so'ng:

1. **http://localhost:3030** manzilini oching (Grafana)
2. `admin` / `btecunit6` bilan kiring
3. **Dashboards → Cloud Networking → Cloud Networking Monitor** ga o'ting

Dashboard quyidagilarni ko'rsatadi:
- Har bir xizmat uchun sekundiga so'rovlar soni
- O'rtacha va persentil kechikish (p50, p95, p99)
- CPU va xotira iste'moli
- Konteyner ishlash vaqti
- Faol ulanishlar

---

## 🌐 Namoyish Etiladigan Tarmoq Tushunchalari

### VPC va Subnetlar
Docker tarmoqlari VPC subnetlarini simulyatsiya qiladi. `public-net` — internetga ochiq (faqat Nginx),
`private-net` — izolyatsiyalangan (backendlar). Yopiq subnetlardagi xizmatlarga to'g'ridan-to'g'ri
murojaat qilib bo'lmaydi — barcha trafik avval Nginx orqali o'tadi.

### Teskari Proksi (Reverse Proxy)
Nginx 8888-portda har bir so'rovni qabul qiladi. Yo'l qoidalariga asoslanib to'g'ri backendga
yo'naltiradi, so'ng backend javobini mijozga qaytaradi. Mijoz backendga bevosita murojaat qilmaydi —
u faqat Nginx IP manzilini ko'radi.

### Yukni Muvozanatlash (Round Robin)
Nginx-ning `upstream` bloki ikkala xizmatni ro'yxatga oladi. Standart bo'yicha Nginx har yangi
so'rov uchun ularni navbatma-navbat tanlaydi. 1-so'rov → 1-Xizmat, 2-so'rov → 2-Xizmat, 3-so'rov → 1-Xizmat...

### Salomatlik Tekshiruvi (Health Check)
Ikkala xizmat ham `GET /health` endpointini ochadi. Agar xizmat ketma-ket 3 ta tekshiruvda
javob bermasa (`max_fails=3 fail_timeout=30s`), Nginx uni ishdan chiqqan deb belgilaydi va
unga trafik yuborishni to'xtatadi.

### NAT Shlyuzi
Docker-ning bridge tarmog'i NAT vazifasini bajaradi. Backend konteynerlar chiquvchi so'rovlar
yuborishi mumkin (masalan, npm, API-larga), lekin kiruvchi ulanishlar faqat Nginx orqali mumkin.

### DNS Aniqlash
Docker Compose ichki DNS yozuvlarini yaratadi. Nginx backendlarga xizmat nomi orqali murojaat qiladi
(`service-1:3001`, `service-2:3002`), Docker DNS esa ularni konteyner IP-lariga tarjima qiladi.
Konteyner qayta ishga tushsa va yangi IP olsa ham, Nginx unga nom orqali yeta oladi.

### Xavfsizlik Devori / Xavfsizlik Guruhlari
Faqat Nginx 8888-portni hostga ochadi. Backend xizmatlar `expose:` (ports: emas) ishlatadi,
ya'ni ular faqat Docker tarmog'i ichida murojaat qilinishi mumkin — bu AWS Security Groups-ning
yopiq subnet resurslariga to'g'ridan-to'g'ri kiruvchi ulanishlarni bloklashini simulyatsiya qiladi.

### Internet Shlyuzi
Nginx konteyneri ham `public-net` (internetga ochiq), ham `private-net` (ichki) ga ulangan.
Bu ochiq subnetda Internet Gateway bo'lgan AWS load balancer-ni aks ettiradi.

---

## 🏗️ Papka Tuzilmasi

```
cloud-networking-demo/
│
├── service-1/                  # ERP Backend Xizmati
│   ├── src/
│   │   ├── index.js            # Express ilova + Prometheus metrikalar
│   │   └── index.test.js       # Birlik testlari
│   ├── package.json
│   └── Dockerfile              # Ko'p bosqichli Docker qurish
│
├── service-2/                  # CRM/WMS Backend Xizmati
│   ├── src/
│   │   ├── index.js
│   │   └── index.test.js
│   ├── package.json
│   └── Dockerfile
│
├── frontend/                   # Dashboard UI
│   ├── index.html              # Bir sahifali dashboard
│   ├── nginx-frontend.conf     # HTML xizmat qilish uchun Nginx sozlamasi
│   └── Dockerfile
│
├── nginx/
│   ├── nginx.conf              # Yukni muvozanatlash sozlamasi (round-robin)
│   └── nginx.ssl.conf          # HTTPS/TLS sozlamasi (ishlab chiqarish)
│
├── monitoring/
│   ├── prometheus/
│   │   └── prometheus.yml      # Barcha xizmatlar uchun scrape sozlamasi
│   └── grafana/
│       ├── datasources/
│       │   └── prometheus.yml  # Prometheus manba avtoprovisioning
│       └── dashboards/
│           ├── dashboard.json  # Tayyor Grafana dashboard
│           └── dashboard-provisioning.yml
│
├── scripts/
│   ├── load-test.sh            # Trafik simulyatsiya skripti
│   └── deploy.sh               # Server joylashtirish skripti
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml           # GitHub Actions pipeline
│
├── docker-compose.yml          # Asosiy stek
├── docker-compose.scale.yml    # Masshtablash kengaytmasi
├── docker-compose.monitoring.yml # Monitoring steki
├── .env.example                # Muhit o'zgaruvchilari shabloni
└── README.md
```

---

## ☁️ Bulutda Joylashtirish (AWS EC2 / DigitalOcean)

### Avtomatlashtirilgan joylashtirish
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh \
  --host SIZNING_SERVER_IP \
  --user ubuntu \
  --key ~/.ssh/your-key.pem
```

### Qo'lda joylashtirish (AWS EC2)
```bash
# 1. EC2 nusxa ishga tushirish (Ubuntu 22.04, demo uchun t2.micro)
# 2. Security Group ochish: 22, 80, 443, 8888, 9090, 3030 portlari
# 3. Serverga SSH orqali kirish
ssh -i your-key.pem ubuntu@SIZNING_EC2_IP

# 4. Docker o'rnatish
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
newgrp docker

# 5. Repozitoriyani klonlash
git clone https://github.com/Miraziz719/networking.git
cd networking

# 6. Stekni ishga tushirish
docker compose up --build -d

# 7. (Ixtiyoriy) Monitoringni ishga tushirish
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

### Let's Encrypt bilan HTTPS / SSL
```bash
# Certbot o'rnatish
sudo apt install certbot -y

# Sertifikat olish (domen nomi avval server IP-ga ko'rsatilgan bo'lishi kerak)
sudo certbot certonly --standalone -d sizningdomeningiz.com

# Sertifikatni nginx ssl papkasiga ko'chirish
sudo cp /etc/letsencrypt/live/sizningdomeningiz.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/sizningdomeningiz.com/privkey.pem nginx/ssl/

# SSL konfiguratsiyaga o'tish
# docker-compose.yml da SSL config volume qatorlarini ochib, keyin:
docker compose up --build -d
```

---

## 🔄 CI/CD Pipeline

GitHub Actions pipeline (`.github/workflows/ci-cd.yml`) avtomatik ishga tushadi:

```
main ga push
     │
     ▼
┌─────────┐    ┌───────────────┐    ┌───────────┐
│  Test   │──▶│ Qurish & Push │───▶│Joylashtir │
│         │    │ Docker images │    │ serverga  │
│ node 18 │    │ Docker Hub    │    │ SSH orqali│
└─────────┘    └───────────────┘    └───────────┘
```

**Kerakli GitHub Secrets:**
| Secret | Qiymat |
|---|---|
| `DOCKER_HUB_USERNAME` | Docker Hub foydalanuvchi nomi |
| `DOCKER_HUB_TOKEN` | Docker Hub kirish tokeni |
| `DEPLOY_HOST` | Server IP manzili |
| `DEPLOY_USER` | SSH foydalanuvchi nomi |
| `DEPLOY_SSH_KEY` | Shaxsiy SSH kalit (`.pem` fayl tarkibi) |

---

## 🛠️ Foydali Buyruqlar

```bash
# Barcha xizmatlar jurnallarini ko'rish
docker compose logs -f

# Muayyan xizmat jurnalini ko'rish
docker compose logs -f service-1

# Konteyner salomatligini tekshirish
docker compose ps

# Xizmatlarni kengaytirish
docker compose up -d --scale service-1=3 --scale service-2=3

# Xizmatni qayta ishga tushirish (nosozlik/tiklashni simulyatsiya qilish)
docker compose restart service-1

# Hamma narsani to'xtatish
docker compose down

# To'xtatib, volumelarni o'chirish (to'liq tiklash)
docker compose down -v

# Yuklamani test qilish
./scripts/load-test.sh --requests 200 --url http://localhost:8888

# Nginx konfiguratsiya sintaksisini tekshirish
docker compose exec nginx nginx -t

# Nginx kirish jurnallarini ko'rish (round-robin amalda)
docker compose logs nginx | grep "upstream="
```

---

## 📚 Ishlatiladigan Texnologiyalar

| Texnologiya    | Versiya | Roli                                 |
|----------------|---------|--------------------------------------|
| Node.js        | 18 LTS  | Backend muhiti                       |
| Express        | 4.18    | HTTP freymvorki                      |
| prom-client    | 15.x    | Prometheus metrikalar SDK            |
| Docker         | 24+     | Konteynerlashtirish                  |
| Docker Compose | v2      | Ko'p konteynerli boshqaruv           |
| Nginx          | 1.25    | Yukni muvozanatlash / Teskari proksi |
| Prometheus     | 2.47    | Metrikalar yig'ish va ogohlantirish  |
| Grafana        | 10.2    | Metrikalarni vizuallashtirish        |
| Node Exporter  | 1.7     | OS darajasidagi metrikalar           |
| cAdvisor       | 0.47    | Konteyner metrikalar                 |
| GitHub Actions | —       | CI/CD avtomatlashtirish              |