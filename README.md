# **AWS CDK Full Stack Application**  
A **full-stack web application** built entirely using **AWS CDK** and **TypeScript**.  

## 🚀 **Overview**  
This application leverages **AWS CDK** to provision cloud infrastructure for a complete web application, including:  
✅ **Authentication (Auth Stack)** - Manages user authentication APIs  
✅ **Product Management (Product Stack)** - Provides APIs for managing products  
✅ **Frontend Hosting (Website Stack)** - Hosts a static website in an **S3 bucket**  

---

## 🛠 **Prerequisites**  
Before getting started, ensure you have the following:  
- **AWS CLI** configured with either:  
  - An **AWS account** for cloud deployment  
  - **LocalStack** for local AWS emulation  
- **Node.js v20+** installed  
- **AWS CDK** installed globally:  
  ```sh
  npm install -g aws-cdk
  ```

---

## ⚡ **Setup Guide**  

### **1️⃣ Clone the Repository**  
```sh
git clone https://github.com/princekr0722/aws_cdk_full_stack_application.git
cd aws_cdk_full_stack_application
```

### **2️⃣ Bootstrap Your AWS Environment**  
This step ensures AWS CDK has the necessary permissions to deploy resources.  
- **For AWS**:  
  ```sh
  cdk bootstrap
  ```
- **For LocalStack**:  
  ```sh
  cdklocal bootstrap
  ```

### **3️⃣ Install Dependencies & Build the Project**  
```sh
npm install
npm run build
```

### **4️⃣ Deploy the Application**  
Deploy all stacks to AWS or LocalStack:  
- **For AWS**:  
  ```sh
  cdk deploy --all
  ```
- **For LocalStack**:  
  ```sh
  cdklocal deploy --all
  ```

After deployment, the console will display **URLs for each stack**.

---

## 🌍 **Accessing the Application**  
Once deployed, you can access the application using the provided URLs in the console.  

- 🔑 **Authentication API (Auth Stack)** → Handles user sign-up and login  
- 📦 **Product API (Product Stack)** → Manages product listings  
- 🌐 **Website (Website Stack)** → Static website hosted on **S3**  

---

## 🧹 **Destroying the Application**  
To remove all deployed resources:  
- **For AWS**:  
  ```sh
  cdk destroy --all
  ```
- **For LocalStack**:  
  ```sh
  cdklocal destroy --all
  ```

---

## 🤝 **Contributing**  
Want to improve this project? Contributions are welcome! Fork the repo, create a branch, and submit a **Pull Request**.  

---
