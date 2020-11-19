# nestjs-docker-deploy

NestJS Docker Deploy to production

npm install -g /Users/xxx/xxx/xxx/nestjs-docker-deploy

--- FOR NestJs Single Project
- create ./deploy  root app 
- cd ./deploy && nest-deploy-one init
- change 
  - information config.json
  - information .env
- nest-deploy-one start 


--- FOR NestJs App Project
- create ./deploy  root app 
- create Folder App in ./deploy/xxx
- cd ./deploy/xxx && nest-deploy-app init
- change 
  - information config.json
  - information .env
- nest-deploy-app start 



