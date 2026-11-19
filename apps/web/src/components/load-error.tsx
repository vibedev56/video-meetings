import { Alert, Button } from '@heroui/react';

interface LoadErrorProps {
  title: string;
  onRetry: () => void;
}

export function LoadError({ title, onRetry }: LoadErrorProps) {
  return (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>
          Проверьте подключение и попробуйте снова.
        </Alert.Description>
      </Alert.Content>
      <Button
        size="sm"
        variant="outline"
        onPress={onRetry}
        className="min-h-11"
      >
        Повторить
      </Button>
    </Alert>
  );
}
