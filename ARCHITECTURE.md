# Greys — Architecture

## Overview

Greys is a self-hosted property management system for short-term rentals.

Main goal of MVP:
replace RealtyCalendar and automate booking creation from Telegram messages.

System will manage bookings for apartments and display them in a calendar grid.

---

## Core Architecture

System consists of several services:

frontend (React + Vite)

backend (FastAPI)

postgres database

telegram bot (aiogram)

Future services:

nginx reverse proxy

WordPress booking module

n8n automation

---

## High Level Diagram

Frontend → Backend API → PostgreSQL

Telegram Bot → Backend API → PostgreSQL

WordPress Website → Backend API → PostgreSQL

All services communicate through the backend REST API.

---

## Technology Stack

Backend  
Python  
FastAPI  
SQLAlchemy  
PostgreSQL

Frontend  
React  
Vite  
Material UI (or Ant Design)

Telegram bot  
Python  
aiogram

Infrastructure  
Docker  
Docker Compose  
Nginx (later on VPS)

---

## Core Entities

### Apartment

Represents rental unit.

Fields:

id  
name  
description  
address  
created_at

---

### Guest

Represents a guest.

Fields:

id  
name  
phone  
telegram  
notes  
created_at

---

### Booking

Represents reservation.

Fields:

id  
apartment_id  
guest_id  

check_in_date  
check_out_date  

total_price  
currency  

status  

source  
external_source  
external_id  

notes  
created_at

---

## Booking Sources

Bookings may come from multiple sources.

manual  
telegram_bot  
website  
api

external sources:

avito  
sutochno  
cian  
yandex_travel

---

## Core API Principle

All bookings are created through a single endpoint:

POST /api/bookings

This allows easy integration of new booking sources without modifying the core system.

---

## UI Concept

Main screen is a booking grid ("шахматка").

Columns: apartments  
Rows: dates

Example:

Date | Studio1 | Studio2
-----|---------|--------
12 Mar | █ |  
13 Mar | █ |  
14 Mar |   | █  

Clicking a cell opens booking creation form.

---

## Future Modules

Telegram automation

WordPress booking widget

Channel manager integrations

Analytics and reporting

Mobile application
