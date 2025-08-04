class NotFoundException(Exception):
    def __init__(self, detail: str):
        self.detail = detail

class BadRequestException(Exception):
    def __init__(self, detail: str):
        self.detail = detail

class UnauthorizedException(Exception):
    def __init__(self, detail: str):
        self.detail = detail

class ForbiddenException(Exception):
    def __init__(self, detail: str):
        self.detail = detail

class InternalServerErrorException(Exception):
    def __init__(self, detail: str):
        self.detail = detail