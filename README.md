# ReserveRecAdmin

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.0.3.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4300/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## 🧪 Sandbox Environments

Sandbox environments allow developers to deploy isolated personal environments for testing.

### Quick Start

```bash
# 1. Setup - copies config from dev
./scripts/sandbox-setup.sh <your-name>

# 2. Deploy
SANDBOX_NAME=<your-name> yarn sandbox:deploy

# 3. Teardown when done
./scripts/sandbox-teardown.sh <your-name>
```

### Full Stack Deployment

For a complete sandbox environment, you must also deploy `reserve-rec-api` and `reserve-rec-public`. See the [reserve-rec-api README](https://github.com/bcgov/reserve-rec-api#-sandbox-environments) for full instructions.

### Available Scripts

| Script | Description |
|--------|-------------|
| `./scripts/sandbox-setup.sh <name> [base-env]` | Copy SSM configs and secrets from base environment |
| `./scripts/sandbox-teardown.sh <name>` | Destroy CDK stacks and cleanup resources |
| `yarn sandbox:deploy` | CDK deploy with SANDBOX_NAME env var |
| `yarn sandbox:destroy` | CDK destroy with SANDBOX_NAME env var |

# Deploying with CDK

The `cdk.json` file tells the CDK Toolkit how to execute your app. The build step is not required when using JavaScript.

## Useful commands

* `npm run test`         perform the jest unit tests
* `npx cdk deploy`       deploy this stack to your default AWS account/region
* `npx cdk diff`         compare deployed stack with current state
* `npx cdk synth`        emits the synthesized CloudFormation template
