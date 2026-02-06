from pydantic import BaseModel, EmailStr

class RegisterIn(BaseModel):
    email: EmailStr
    username: str
    password: str
    password2: str

class LoginIn(BaseModel):
    identifier: str
    password: str

class TokenOut(BaseModel):
    token: str
