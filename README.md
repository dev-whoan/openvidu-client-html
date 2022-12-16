# openvidu-client-html
Openvidu Client HTML Version

## How to Run
1. Download Openvidu-call
`curl https://s3-eu-west-1.amazonaws.com/aws.openvidu.io/install_openvidu_latest.sh | bash `

2. Create(Update) your docker-compose.override.yml inside of OpenVidu & Run
```
~$ cd openvidu
~$ sudo ./openvidu stop

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
        logging:
            options:
                max-size: "${DOCKER_LOGS_MAX_SIZE:-100M}"

~$ sudo ./openvidu restart

```
