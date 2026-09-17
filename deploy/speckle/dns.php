<?php
declare(strict_types=1);
const APP_ROOT = '/opt/certbot-transip-dns-01-validator';
require APP_ROOT . '/vendor/autoload.php';
require APP_ROOT . '/src/app.php';
$client = $container->get(RoyBongers\CertbotDns01\Providers\TransIp\TransIp::class)->getTransIpApiClient();
$entries = $client->domainDns()->getByDomainName('open-aec.com');
foreach (['speckle', 'speckle-files'] as $name) {
    $existing = array_values(array_filter($entries, fn($e) => $e->getName() === $name));
    if ($existing !== []) {
        if (count($existing) === 1 && $existing[0]->getType() === 'A' && $existing[0]->getContent() === '167.235.54.105') {
            echo "$name.open-aec.com already points to this server\n";
            continue;
        }
        throw new RuntimeException("Existing $name DNS records differ; no record replaced");
    }
    echo "DNS record: $name.open-aec.com A 167.235.54.105 TTL 300\n";
    if (($argv[1] ?? '') !== '--apply') continue;
    $entry = new Transip\Api\Library\Entity\Domain\DnsEntry();
    $entry->setName($name);
    $entry->setType('A');
    $entry->setContent('167.235.54.105');
    $entry->setExpire(300);
    $client->domainDns()->addDnsEntryToDomain('open-aec.com', $entry);
    echo "Created $name.open-aec.com\n";
}
