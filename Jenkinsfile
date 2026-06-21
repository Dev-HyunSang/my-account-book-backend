// CI/CD for a single-host Docker Compose deployment.
//
// Jenkins prerequisites (configure once in the UI):
//   - Plugins: Docker Pipeline, SSH Agent, Credentials Binding
//   - The Jenkins agent has `docker` (and `node` 20 / `npm`) on PATH
//   - Credentials:
//       'registry-cred' : username + token for ghcr.io (Username/Password)
//       'deploy-ssh'    : SSH private key for the deploy server
//   - The DEPLOY server has Docker + compose, is logged in to the registry
//     once (`docker login ghcr.io`), and holds /opt/account-book/.env.prod

pipeline {
  agent any

  environment {
    REGISTRY    = 'ghcr.io/TODO-your-name'          // TODO: change
    IMAGE_NAME  = 'account-book'
    IMAGE       = "${REGISTRY}/${IMAGE_NAME}:${GIT_COMMIT.take(7)}"
    DEPLOY_HOST = 'deploy@TODO-your-server'          // TODO: change
    DEPLOY_DIR  = '/opt/account-book'
  }

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  stages {
    stage('Install & Test') {
      steps {
        sh 'npm ci'
        sh 'npm run lint'
        sh 'npm run test:unit'
      }
    }

    stage('Build & Push') {
      steps {
        script {
          docker.withRegistry("https://${REGISTRY}", 'registry-cred') {
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
