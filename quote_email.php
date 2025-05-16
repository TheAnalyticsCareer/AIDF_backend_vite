<?php
require 'vendor/autoload.php';

// Validate input
if (!isset($argv[1])) {
    die("Error: No data provided");
}

$enquiryData = json_decode($argv[1], true);
if (json_last_error() !== JSON_ERROR_NONE) {
    die("Error: Invalid JSON");
}

$mail = new PHPMailer\PHPMailer\PHPMailer(true);
try {
    // Gmail SMTP
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'kumarshivam22122000@gmail.com';
    $mail->Password   = 'pdqh wshb qepk izuz'; // Your App Password
    $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    // Sender/Recipient
    $mail->setFrom('kumarshivam22122000@gmail.com', 'Shivam Kumar'); 
    $mail->addAddress('careeranalytics499@gmail.com', 'Analytics Career');

    // Content
    $mail->isHTML(true);
    $mail->Subject = 'New Quote: ' . htmlspecialchars($enquiryData['name']);
    $mail->Body    = sprintf(
        "<h1>New Quote</h1>
        <p><strong>Name:</strong> %s</p>
        <p><strong>Phone:</strong> %s</p>
        <p><strong>Email:</strong> %s</p>
        <p><strong>Price:</strong> %s</p>
        <p><strong>Height:</strong>%s</p>
        <p><strong>Material:</strong>%s</p>
        <p><strong>Finish:</strong>%s</p>
        ",
        htmlspecialchars($enquiryData['name']),
        htmlspecialchars($enquiryData['phone']),
        htmlspecialchars($enquiryData['email']),
        htmlspecialchars($enquiryData['price']),
        htmlspecialchars($enquiryData['height']),
        htmlspecialchars($enquiryData['material']),
        htmlspecialchars($enquiryData['finish'])
    );

    $mail->send();
    echo 'Email sent successfully';
} catch (Exception $e) {
    die("Mailer Error: " . $e->getMessage());
}