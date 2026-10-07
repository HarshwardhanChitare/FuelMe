# FuelMe
# Fuel Me — Smart Self-Service Fueling

Fuel Me is a **smart self-service fueling web application prototype** designed to make the fuel station experience faster, simpler, and more convenient.

The application provides a mobile-style interface where customers can create an account, scan a fuel pump QR code, select fuel and payment methods, authorize a payment, simulate fuel dispensing, and generate a digital receipt.

> **Project Type:** College / Academic Prototype
> **Version:** 1.2
> **Application:** Smart Self-Service Fueling

---

## Features

### 1. Account Management

* Create a new Fuel Me account.
* Select from saved customer accounts.
* Store customer profile information.
* Add:

  * Full Name
  * Mobile Number
  * Email Address
  * Vehicle Number
  * Vehicle Type
* Edit and switch between accounts.
* Sign out of an account.

### 2. Home Dashboard

The home screen provides:

* Customer greeting
* QR code scanning option
* Monthly average fuel spending
* Total transactions
* Recent transactions
* Navigation to Home, History, and Profile.

### 3. QR Pump Scanning

Customers can scan the QR code available at a fuel pump to start a fueling session.

The current version operates in **prototype mode**, where the pump QR detection is simulated.

### 4. Fuel Selection

Users can select:

* Petrol
* Diesel

The application also calculates an estimated fuel quantity based on the entered fuel amount and displayed fuel rate.

### 5. Payment Methods

The prototype supports the following payment options:

* UPI
* Credit / Debit Card
* Wallet
* Cash

### 6. Payment Authorization

After selecting the payment method, the application shows a payment authorization process with stages such as:

* Verifying Details
* Processing with Bank
* Confirming Transaction

### 7. Fuel Dispensing Simulation

After successful payment, the application displays a fueling-in-progress screen.

It shows:

* Pump ID
* Fuel type
* Detected vehicle type
* Vehicle number
* Authorized amount
* Fuel quantity
* Fuel dispensing progress

### 8. Digital Receipt

After fueling is completed, users can generate a digital receipt containing:

* Customer name
* Vehicle number
* Pump ID
* Amount paid
* Payment method
* Fuel quantity
* Date and time
* Transaction ID

The receipt can also be printed or saved.

### 9. Transaction History

Users can view completed fuel transactions and filter them by:

* All
* Petrol
* Diesel

### 10. User Profile

The profile section allows users to manage personal and vehicle information and access:

* Transaction History
* Payment Methods
* Settings
* Help & Support
* About Fuel Me

---

## Project Structure

```text
Fuel-Me/
│
├── index.html
├── style.css
├── script.js
└── README.md
```

### `index.html`

Contains the complete structure of the Fuel Me application, including all screens such as Login, Home, QR Scanner, Payment, Authorization, Dispensing, Receipt, History, Profile, and Failure screens.

### `style.css`

Contains the visual styling and responsive mobile-app interface.

### `script.js`

Contains the application logic and interactions between different screens.

---

## Application Flow

```text
Start
  ↓
Splash Screen
  ↓
Choose / Create Account
  ↓
Home Dashboard
  ↓
Scan Pump QR
  ↓
Select Fuel Type
  ↓
Enter Fuel Amount
  ↓
Select Payment Method
  ↓
Payment Authorization
  ↓
Payment Successful
  ↓
Fuel Dispensing
  ↓
Fueling Complete
  ↓
Generate Digital Receipt
  ↓
Transaction History
```

---

## Technologies Used

* HTML5
* CSS3
* JavaScript
* Responsive Mobile UI
* Browser Local Storage / Client-side application logic

---

## How to Run

### Method 1 — Directly in Browser

1. Download or clone the project.
2. Keep the following files in the same folder:

```text
index.html
style.css
script.js
```

3. Open `index.html` in a web browser.

---

### Method 2 — Using VS Code

1. Open the project folder in **Visual Studio Code**.
2. Install the **Live Server** extension.
3. Open `index.html`.
4. Right-click the file.
5. Select **Open with Live Server**.
6. The Fuel Me application will open in your browser.

---

## Important Note

This is currently a **prototype application**.

Some real-world functions are simulated, including:

* Pump QR detection
* Payment processing
* Bank authorization
* Fuel dispensing
* Vehicle detection

Therefore, the application demonstrates the **user experience and workflow** of a smart self-service fueling system rather than directly controlling a real fuel pump or processing real payments.

---

## Future Scope

The prototype can be extended into a real-world application by integrating:

* Real QR code scanning
* Real fuel station/pump APIs
* Secure payment gateway
* UPI integration
* Real-time pump communication
* IoT-enabled fuel pumps
* Vehicle identification
* Digital FASTag/vehicle integration
* GPS-based fuel station discovery
* Cloud database
* User authentication
* Push notifications
* Fuel price APIs
* Real-time transaction monitoring
* Cloud-based transaction history

---

## Safety & Security

A production version should implement:

* Secure authentication
* Encrypted customer information
* Secure payment processing
* Server-side validation
* HTTPS
* Secure API communication
* Role-based access
* Transaction verification
* Protection against unauthorized pump activation

---

## Project Objective

The main objective of Fuel Me is to demonstrate how a **digital self-service fueling system** can reduce manual interaction at fuel stations and provide customers with a convenient workflow for:

**Fuel → Pay → Go**

---

## Status

**Current Status:** Working Prototype

The interface and workflow are designed for demonstration and academic/hackathon purposes. Real fuel pump control and payment processing would require appropriate backend services, APIs, hardware integration, security, and regulatory approval.
