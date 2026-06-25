// CI/CD for a single-host Docker Compose deployment.
//
// Jenkins prerequisites (configure once in the UI):
//   - Plugins: Docker Pipeline, SSH Agent, Credentials Binding
//   - The Jenkins agent has `docker` on PATH with access to the daemon
//     (node steps run inside a node:20-alpine container, so node is NOT needed)
//   - Credentials:
//       'registry-cred' : username + token for ghcr.io (Username/Password)
//       'deploy-ssh'    : SSH private key for the deploy server
//   - The DEPLOY server has Docker + compose, is logged in to the registry
//     once (`docker login ghcr.io`), and holds /opt/account-book/.env.prod

pipeline {
  agent any

  environment {
    REGISTRY    = 'ghcr.io/dev-hyunsang'
    IMAGE_NAME  = 'account-book-backend'
    IMAGE       = "${REGISTRY}/${IMAGE_NAME}:${GIT_COMMIT.take(7)}"
    DEPLOY_HOST = 'deploy@100.119.217.13'
    DEPLOY_DIR  = '/opt/account-book'
  }

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  stages {
    stage('Install & Test') {
      // Run in a node container so the Jenkins host only needs Docker, not node.
      agent { docker { image 'node:20-alpine'; reuseNode true } }
      steps {
        sh 'npm ci'
        sh 'npm run lint'
        sh 'npm run test:unit'
      }
    }

    stage('Build & Push') {
      steps {
        script {
          docker.withRegistry("https://${REGISTRY}", 'ghcr_credential') {
            def img = docker.build("${IMAGE}")
            img.push()
            img.push('latest')
          }
        }
      }
    }

    stage('Deploy') {
      steps {
        sshagent(['deploy-ssh']) {
          // Keep the compose file on the server in sync with the repo.
          sh "scp -o StrictHostKeyChecking=no docker-compose.prod.yml ${DEPLOY_HOST}:${DEPLOY_DIR}/docker-compose.prod.yml"
          sh """
            ssh -o StrictHostKeyChecking=no ${DEPLOY_HOST} '
              set -e
              cd ${DEPLOY_DIR}
              export IMAGE=${IMAGE}
              docker compose -f docker-compose.prod.yml pull
              docker compose -f docker-compose.prod.yml up -d postgres redis
              docker compose -f docker-compose.prod.yml run --rm app npm run migration:run:prod
              docker compose -f docker-compose.prod.yml up -d app
              docker image prune -f
            '
          """
        }
      }
    }
  }

  post {
    success { echo "Deployed ${IMAGE}" }
    failure { echo 'Pipeline failed — server left on previous image.' }
  }
}
