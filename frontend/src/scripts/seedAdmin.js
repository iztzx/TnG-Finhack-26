// Run once: node src/scripts/seedAdmin.js
// Creates the admin user in Cognito + DynamoDB

const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } = require("@aws-sdk/client-cognito-identity-provider");
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");

// Configuration
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || "YOUR_USER_POOL_ID";
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "PantasFlowUsers";
const REGION = process.env.AWS_REGION || "ap-southeast-1";

const adminUser = {
  email: "admin@pantasflow.com",
  password: "PantasFlow@Admin2025",
  role: "admin"
};

const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });
const dynamoClient = new DynamoDBClient({ region: REGION });

async function seedAdmin() {
  console.log(`[PantasFlow Setup] Seeding admin account: ${adminUser.email}`);
  
  let userId;

  try {
    // 1. Create user in Cognito
    const createCmd = new AdminCreateUserCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: adminUser.email,
      UserAttributes: [
        { Name: "email", Value: adminUser.email },
        { Name: "email_verified", Value: "true" }
      ],
      MessageAction: "SUPPRESS" // Don't send email
    });
    
    const createRes = await cognitoClient.send(createCmd);
    userId = createRes.User.Attributes.find(a => a.Name === "sub").Value;
    
    // 2. Set password permanently
    const setPassCmd = new AdminSetUserPasswordCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: adminUser.email,
      Password: adminUser.password,
      Permanent: true
    });
    
    await cognitoClient.send(setPassCmd);
    console.log("✓ Admin user created in Cognito");
    
  } catch (err) {
    if (err.name === 'UsernameExistsException') {
      console.log("! Admin user already exists in Cognito, skipping creation.");
      // We would normally fetch the user sub here, but for simplicity assuming we don't need to overwrite DynamoDB if user exists
      return;
    } else {
      console.error("Failed to create admin in Cognito:", err);
      return;
    }
  }

  try {
    // 3. Create record in DynamoDB
    const putItemCmd = new PutItemCommand({
      TableName: DYNAMODB_TABLE_NAME,
      Item: {
        userId: { S: userId },
        email: { S: adminUser.email },
        role: { S: adminUser.role },
        createdAt: { S: new Date().toISOString() },
        updatedAt: { S: new Date().toISOString() }
      }
    });

    await dynamoClient.send(putItemCmd);
    console.log("✓ Admin profile created in DynamoDB");
    
  } catch (err) {
    console.error("Failed to create admin profile in DynamoDB:", err);
  }
  
  console.log("[PantasFlow Setup] Admin seeding complete!");
}

seedAdmin();
