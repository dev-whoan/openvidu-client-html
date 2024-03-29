# openvidu-client-html
Openvidu Client HTML Version

## How to Run
1. Download Openvidu-call
`curl https://s3-eu-west-1.amazonaws.com/aws.openvidu.io/install_openvidu_latest.sh | bash `

2. Create(Update) your docker-compose.override.yml inside of OpenVidu & Run
```
~$ cd openvidu
~$ sudo ./openvidu stop
~$ vi .env

...
# Add below properties

# value: true | false
OPENVIDU_AUTO_RECORDING=false

# URI for main page of openvidu-call-html.
MEETING_HOME=/meeting

# JsonWebToken for external plugins on your server...
# Such that MSA, you can add another server, such that web server,
# and to communicate, original OpenVidu uses cookies,
# So to authorize your account, you can use just JWT.
# openvidu-call-back of mine only provides verifying the jwt.
# The jwt must include timestamp which is unixtime type.
# secret for JWT
JWT_SECRET=MY_JWT_SECRET
# lifetime of JWT.
JWT_LIFETIME=600

~$ vi docker-compose.override.yml

version: '3.1'

services:
    # --------------------------------------------------------------
    #
    #   Change this if your want use your own application.
    #   It's very important expose your application in port 5442
    #   and use the http protocol.
    #
    #   Default Application
    #
    #   HTML OpenVidu Call Is Based On
    #   Openvidu Version: 2.24.0
    #
    #   Added Environment Variables
    #   CALL_AUTO_RECORDING
    #   - Whether start recording when the session just created or not.
    #     IF it is not set, default value is false
    #     Value: true / false
    #   MEEETING_HOME
    #   - Openvidu Call Home URI.
    #     If it is not set, based uri is: /meeting
    # --------------------------------------------------------------
    # openvidu/openvidu-call:2.24.0
    app:
        image: devwhoan/openvidu-call-html:0.0.7
        restart: on-failure
        network_mode: host
        volumes:
            - ./public:/opt/openvidu-call/dist/public
        environment:
            - SERVER_PORT=5442
            - OPENVIDU_URL=http://localhost:5443
            - OPENVIDU_SECRET=${OPENVIDU_SECRET}
            - CALL_OPENVIDU_CERTTYPE=${CERTIFICATE_TYPE}
            - CALL_PRIVATE_ACCESS=${CALL_PRIVATE_ACCESS:-}
            - CALL_USER=${CALL_USER:-}
            - CALL_SECRET=${CALL_SECRET:-}
            - CALL_ADMIN_SECRET=${CALL_ADMIN_SECRET:-}
            - CALL_RECORDING=${CALL_RECORDING:-}
            - CALL_AUTO_RECORDING=${OPENVIDU_AUTO_RECORDING:-}
            - MEETING_HOME=${MEETING_HOME:-}
            - JWT_SECRET=${JWT_SECRET:-}
            - JWT_LIFETIME=${JWT_LIFETIME:-}
        logging:
            options:
                max-size: "${DOCKER_LOGS_MAX_SIZE:-100M}"

~$ sudo ./openvidu restart

```

###
#### 본 프로젝트를 통해 WebRTC 서비스를 구현할 때
- openvidu-call-html 만 수정한 경우, 위에서 알려주는 대로 openvidu를 설치한 뒤, docker-compose-override.yml의 내용 중 Docker Volume Mount 부분의 내용을 수정하여 해당 경로를 Mount 시켜 주거나, 아니면 설치된 openvidu 폴더 내에 public 디렉토리를 생성하고, 그 아래에 css html js img를 만들고 해당하는 리소스를 넣으면 된다.
