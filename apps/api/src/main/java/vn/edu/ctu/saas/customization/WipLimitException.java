package vn.edu.ctu.saas.customization;

@org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY)
public class WipLimitException extends RuntimeException {
    public WipLimitException(String message) { super(message); }
}
