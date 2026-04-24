// Mock aws-exports.js for local dev before amplify push
const awsmobile = {
  "aws_project_region": "ap-southeast-1",
  "aws_cognito_region": "ap-southeast-1",
  "aws_user_pools_id": "ap-southeast-1_XXXXX",
  "aws_user_pools_web_client_id": "XXXXXXXXXXXXXXXXXX",
  "oauth": {},
  "aws_cognito_username_attributes": [
      "EMAIL"
  ],
  "aws_cognito_social_providers": [],
  "aws_cognito_signup_attributes": [
      "EMAIL",
      "PHONE_NUMBER"
  ],
  "aws_cognito_mfa_configuration": "OFF",
  "aws_cognito_mfa_types": [
      "SMS"
  ],
  "aws_cognito_password_protection_settings": {
      "passwordPolicyMinLength": 8,
      "passwordPolicyCharacters": [
          "REQUIRES_LOWERCASE",
          "REQUIRES_NUMBERS",
          "REQUIRES_SYMBOLS",
          "REQUIRES_UPPERCASE"
      ]
  },
  "aws_cognito_verification_mechanisms": [
      "EMAIL"
  ]
};

export default awsmobile;
